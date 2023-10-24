const fs = require("node:fs");
const readline = require("readline");
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let authorFile = "./authors.csv";
let authors = [];

function trimUrl(url){
    let startPos = url.indexOf('@');
    if(startPos++ == -1){ return null; }
    let endPos = url.indexOf('/', startPos);
    if(endPos == -1){ endPos = url.length; }
    
    return url.substring(startPos, endPos);
}

function inList(url){
    let userID = trimUrl(url);
    for(let i = 0; i < authors.length; ++i){
        let a = authors[i];
        if(a.userID == userID){ return true; }
    }
    return false;
}

function addAuthor(n, id){
    authors.push({name: n, userID: id});
    fs.appendFileSync(authorFile, n + ',' + id + '\n');
}

function loadAuthors(file){
    authors = [];
    let data = fs.readFileSync(file, {encoding: 'utf-8'});

    let lines = data.split('\n');
    for(let i = 0; i < lines.length; ++i){
        let l = lines[i];
        if(l == ''){ return; }
        let vals = l.split(',');
        if(vals[0] == null || vals[1] == null){ break; }
        authors.push({name: vals[0], userID: vals[1]});
    }
}

function getAuthor(url){
    url = "https://odysee.com/@" + trimUrl(url);
    return fetch(url).then(async (res) => {
        if(res.status != 200){ return null; }
        let text = await res.text();
        let startPos = text.indexOf("<title>");
        if(startPos == -1){ return null; }
        startPos += 7;
        let endPos = text.indexOf("</title>", startPos);
        return text.substring(startPos, endPos);
    });
}

function askForURL(prompt){
    rl.question(prompt, async (ans) => {
        if(ans[0] != 'q'){
            if(ans[0] == 'h'){
                if(inList(ans) == false){
                    addAuthor(await getAuthor(ans), trimUrl(ans));
                    console.log(authors.at(-1));
                }
                else{
                    rl.write("Already in list\n");
                }
            }
            askForURL(prompt);
            return null;
        }
        return null;
    });
}


let main = () => {
    let prompt = "Enter URL -> ";
    loadAuthors(authorFile);
    askForURL(prompt);
}

main();