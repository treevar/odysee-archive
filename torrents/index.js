import fetch from "node-fetch";
const API = "https://apibay.org/t.php?";
const TOKEN_REGEX = "id=[0-9]{8}";

let inStr = ``;
let tokens = [...inStr.matchAll(TOKEN_REGEX)];//Why doesn't matchAll return an array? The example code does this.
for(let i = 0; i < tokens.length; ++i){
    let t = tokens[i][0];
    let url = API + t;
    fetch(url).then((res)=>{
        if(res.status != 200){ console.log(`${t} -> ${res.status}`); }
        else{
            res.text().then((txt)=>{
                let data = JSON.parse(txt);
                let out = `"${data.name}",${data.username},${data.info_hash}`;
                console.log(out);
            });
        }
    })
}
