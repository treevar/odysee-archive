const fs = require("node:fs");
const readline = require("readline");
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const BASE_URL = "https://odysee.com/@";
let authorFile = "./authors.csv";
let authors = [];

//Replaces some encoded chars
//Encloses str in "" if it contains a ',' to conform with the CSV format
function parseString(str){
    str = str.replaceAll("&#039;", "'");
    str = str.replaceAll("&amp;", '&');
    if(str.indexOf(',') != -1){
        str = '"' + str + '"';
    }
    return str;
}

//Return user id from url
function trimUrl(url){
    let startPos = url.indexOf('@');
    if(startPos++ == -1){ return null; }
    let endPos = url.indexOf('/', startPos);
    if(endPos == -1){ endPos = url.length; }
    
    return parseString(url.substring(startPos, endPos));
}

//Return whether the author is already in the list
function inList(id){
    for(let i = 0; i < authors.length; ++i){
        let a = authors[i];
        if(a.userID == id){ return true; }
    }
    return false;
}

//Add an author to the file and memory
function addAuthor(n, id){
    authors.push({name: n, userID: id});
    fs.appendFileSync(authorFile, n + ',' + id + ',' + BASE_URL + id + '\n');
}

//Properly splits up line into it's values, even when a value contains a comma
function parseCsvLine(line){
    if(line.length == 0){ return null; }
    let vals = line.split(',');
    let result = [];
    let quoteHit = 0;
    for(let i = 0; i < vals.length; ++i){
        if(vals[i].startsWith('"')){
            quoteHit = 1;
            result.push(vals[i]);
        }
        else if(quoteHit){
            if(vals[i].endsWith('"')){
                quoteHit = 0;
            }
            result[result.length-1] += (',' + vals[i]);
        }
        else{
            result.push(vals[i]);
        }
    }
    return result;
}

//Loads authors from file
function loadAuthors(file){
    authors = [];
    let data = fs.readFileSync(file, {encoding: "utf-8"});

    let lines = data.split('\n');
    for(let i = 1; i < lines.length; ++i){
        let l = parseCsvLine(lines[i]);
        if(l == null){ break; }
        if(l[0] == null || l[1] == null){ break; }
        authors.push({name: l[0], userID: l[1]});
    }
}

//Gets display name
function getAuthor(id){
    url = BASE_URL + id;
    return fetch(url).then(async (res) => {
        if(res.status != 200){ return null; }
        let text = await res.text();
        let startPos = text.indexOf("<title>");
        if(startPos == -1){ return null; }
        startPos += 7;
        let endPos = text.indexOf("</title>", startPos);
        return parseString(text.substring(startPos, endPos));
    });
}

//Adds author with checks to maintain data integrity
async function authorAddCheck(userID){
    if(inList(userID) == false){
        let dispName = await getAuthor(userID);
        //Pages that don't exist anymore have 'Odysee' set as their title
        //could cause probs if someone sets their name to 'Odysee'
        if(dispName == "Odysee"){ return false; }
        addAuthor(dispName, userID);
        console.log(authors.at(-1));
        return true;
    }
    return false;
}

//Asks user for url and tries to add to list
function askForURL(prompt){
    rl.question(prompt, async (ans) => {
        if(ans[0] != 'q'){
            if(ans.startsWith(BASE_URL)){
                let userID = trimUrl(ans);
                if(!authorAddCheck(userID)){
                    rl.write("Already in list\n");
                }
            }
            askForURL(prompt);
            return null;
        }
        return null;
    });
}

/*
    let lines = fs.readFileSync("list.txt", {encoding: "utf-8"}).split('\n');
    for(let i = 0; i < lines.length; ++i){
        let line = lines[i];
        if(line.startsWith(BASE_URL)){
            let userID = trimUrl(line);
            if(userID == null){ continue; }
            if(!authorAddCheck(userID)){
                rl.write("Already in list\n");
            }
        }
    }
*/
/*
let lines = fs.readFileSync("authors.csv", {encoding: "utf-8"}).split('\n');
for(let i = 1; i < lines.length; ++i){
    if(lines[i] == ""){ continue; }
    let vals = lines[i].split(',');
    fs.appendFileSync("authors1.csv", lines[i] + ',' + BASE_URL + vals[1] + '\n');
}
*/


let main = () => {
    let prompt = "Enter URL -> ";
    loadAuthors(authorFile);
    askForURL(prompt);
}

main();