const fs = require("node:fs");
const prompt = require("prompt-sync")();

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
    return fetch(url).then((res) => {
        if(res.status != 200){ return null; }
        let startPos, endPos;
        return res.text().then((txt) => {
            startPos = txt.indexOf("<title>");
            if(startPos == -1){ return null; }
            startPos += 7;
            endPos = txt.indexOf("</title>", startPos);
            return parseString(txt.substring(startPos, endPos));
        });
        
    });
}

//Adds author with checks to maintain data integrity
function authorAddCheck(userID){
    if(inList(userID) == false){
        return getAuthorName(userID).then((dispName) => {
            //Pages that don't exist anymore have 'Odysee' set as their title
            //could cause probs if someone sets their name to 'Odysee'
            if(dispName == null || dispName == "Odysee"){ return false; }
            if(inList(userID) == false){//Check again because it could have been added in the time we waited for the username
                addAuthor(dispName, userID); 
                console.log(authors.at(-1));
                return true;
            }
        });
       
    }
    return false;
}

//Searches a file for urls and adds them to the list
async function searchAndAddAuthors(fileName){
    return new Promise(async (resolve)=>{
        let lines = fs.readFileSync(fileName, {encoding: "utf-8"}).split('\n');
        for(let i = 0; i < lines.length; ++i){
            let line = lines[i];
            let index = line.indexOf(BASE_URL);
            while(index != -1){
                await authorAddCheck(urlToUserId(line.substring(index)));
                index = line.indexOf(BASE_URL, index + BASE_URL.length);
            }
        }
        resolve();
    });
}

let pause = 0;

//Asks user for url and tries to add to list
function askForURL(prmpt){
    let ans = prompt(prmpt);
    if(ans == null){ return null; }
    if(ans.startsWith(BASE_URL)){
        let userID = urlToUserId(ans);
        return userID;
    }
    return null;
}

function makeMenu(options){
    let result = "Make a selection:\n"
    for(let i = 0; i < options.length; ++i){
        result += (`\t${i+1}. ${options[i]}\n`);
    }
    return result;
}

function promptForAddFile(input){
    if(input == null){
        promptForAddFile(prompt("Enter a filename: "));
    }
    else{
        pause=1;
        console.log("Processing File...\n");
        searchAndAddAuthors(input).then(()=>{pause=0;});
    }
}

function promptForLoadFile(input){
    if(input == null){
        promptForLoadFile(prompt("Enter a filename: "));
    }
    else{
        loadAuthors(input);
    }
}

function promptUserForUrl(input){
    if(input == null){
        promptUserForUrl(askForURL("Enter a URL: "));
    }
    else{
        if(!(authorAddCheck(input))){
            console.log("Channel already in list or doesn't exist");
        }
        else{
            console.log(authors.at(-1));
        }
    }
}

function mainMenu(sel){
    //console.log(sel);
    if(sel == 1){ promptUserForUrl(); }
    else if(sel == 2){ promptForAddFile(); }
    else if(sel == 3){ promptForLoadFile(); }
    else if(sel == 4){ return 1; }
    else{
        let ask = makeMenu(["Manual URL Entry", "Add From File", "Load Authors", "Quit"]);
        console.log(ask);
        let input = prompt(" > ");
        return mainMenu(input);
    }
    return 0;
}

let mainIntervalId;

function mainLoop(){
    if(!pause){
        if(mainMenu() == 1){ clearInterval(mainIntervalId); }
    }
}

let main = () => {
    loadAuthors(authorFile);
    mainIntervalId = setInterval(mainLoop, 100);

    return;
    let input = askForURL(prompt);
    while(input != 'q'){
        if(!authorAddCheck(input)){
            rl.write("Already in list\n");
        }
        input = askForURL(prompt);
    }
    
}

main();