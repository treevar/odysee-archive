const fs = require("node:fs");
const readline = require("node:readline");
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
function urlToUserId(url){
    let startPos = url.indexOf('@');
    if(startPos++ == -1){ return null; }
    const endSymbols = "?/, ";//Used to find end of user id
    let endPos = -1;
    let discrimIndex = url.indexOf(':', startPos); //get index at end of user id
    for(let i = 0; i < endSymbols.length; ++i){ //attempt to find end of url
        let symbolIndex = url.indexOf(endSymbols[i], discrimIndex);
        if((symbolIndex != -1 && symbolIndex < endPos) || endPos == -1){ endPos = symbolIndex; }
    }
    if(endPos == -1){ 
        endPos = url.length; 
    }
    
    return parseString(url.substring(startPos, endPos));
}

//Return whether the author is already in the list
function inList(id){
    if(id == null){ return false; }
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
    //split line up into comma seperated values
    //if a value contains commas it will also be split
    let vals = line.split(',');
    let result = [];
    let quoteHit = 0;
    //Puts values that contain a comma back together
    for(let i = 0; i < vals.length; ++i){
        if(quoteHit){
            result[result.length-1] += (',' + vals[i]);
        }
        else{ 
            result.push(vals[i]); 
        }

        if(vals[i].startsWith('"')){
            quoteHit = 1;
        }
        if(vals[i].endsWith('"')){
            quoteHit = 0;
        }
    }
    return result;
}

//Loads authors from file
function loadAuthors(file){
    authors = [];
    let lines = fs.readFileSync(file, {encoding: "utf-8"}).split('\n');
    for(let i = 1; i < lines.length; ++i){
        let vals = parseCsvLine(lines[i]);
        if(vals == null || vals[0] == null || vals[1] == null){ continue; }
        authors.push({name: vals[0], userID: vals[1]});
    }
}

//Gets display name
function getAuthorName(id){
    if(id == null){ return null; }
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
        let dispName = await getAuthorName(userID);
        //Pages that don't exist anymore have 'Odysee' set as their title
        //could cause probs if someone sets their name to 'Odysee'
        if(dispName == null || dispName == "Odysee"){ return false; }
        if(inList(userID) == false){//Check again because it could have been added in the time we waited for the username
            addAuthor(dispName, userID); 
            console.log(authors.at(-1));
            return true;
        }
    }
    return false;
}

//Searches a file for urls and adds them to the list
function searchAndAddAuthors(fileName){
    let lines = fs.readFileSync(fileName, {encoding: "utf-8"}).split('\n');
    for(let i = 0; i < lines.length; ++i){
        let line = lines[i];
        let index = line.indexOf(BASE_URL);
        while(index != -1){
            authorAddCheck(urlToUserId(line.substring(index)));
            index = line.indexOf(BASE_URL, index + BASE_URL.length);
        }
    }
}

//Asks user for url and tries to add to list
function askForURL(prompt){
    rl.question(prompt, (ans) => {
        if(ans[0] != 'q'){
            if(ans.startsWith(BASE_URL)){
                let userID = urlToUserId(ans);
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

let main = () => {
    let prompt = "Enter URL -> ";
    loadAuthors(authorFile);
    //searchAndAddAuthors("list.txt");
    askForURL(prompt);
}

main();