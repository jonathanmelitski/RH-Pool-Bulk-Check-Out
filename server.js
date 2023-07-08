const express = require('express');
const { Client } = require('@notionhq/client');
require('dotenv').config();
const axios = require('axios');
const https = require('https');

const cors = require('cors');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

const app = express();

var privateKey  = fs.readFileSync('./sslcert/privkey.pem', 'utf8');
var certificate = fs.readFileSync('./sslcert/fullchain.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};

const settingsId = process.env.NOTION_SETTINGS_ID;
const notion = new Client({auth:process.env.NOTION_API_KEY});
const timestationKey = process.env.TIMESTATION_API_KEY;

app.use(cors());



app.get("/checkOutUsers", jsonParser, async(req, res) => {
    var groupsToCheckOut = [];
    var userIDsToCheckOut = [];
    const payload = {
        database_id: settingsId
    }

    try {
        const response = await notion.databases.query(payload);
        
        console.log(response.results[0])
        response.results.forEach(result => {
            if(result.properties.Enable.checkbox){
                groupsToCheckOut.push(result.properties.Name.title[0].plain_text)
            }
        })
        console.log(groupsToCheckOut);


        const getUsersConfig = {
            method: 'get',
            url: 'https://api.mytimestation.com/v1.2/employees',
            auth: {
                username: timestationKey
            }
        }
        await axios.request(getUsersConfig).then(async(resp) => {
            const employees = resp.data.employees;
            employees.forEach((employee) => {
                if(employee.status=="in" && groupsToCheckOut.includes(employee.current_department)){
                    console.log(employee.name + " " + employee.current_department + employee.employee_id);
                    userIDsToCheckOut.push(employee.employee_id);
                }
            })
            console.log(userIDsToCheckOut.length);
            
        }).catch((resp) => {
            //res.json(resp);
        });

        /*const checkOutUsersConfig = {
            method: 'put',
            url: 'https://api.mytimestation.com/v1.2/employees//check-out',
            auth: {
                username: timestationKey
            }
        }
        await axios.request(checkOutUsersConfig).then(resp => {
            res.json(resp);
        }
            
        )*/

        if(userIDsToCheckOut.length == 0){
            res.status(400).json("Error! No checked-in users currently in the selected groups.");
            return;
        }
        await userIDsToCheckOut.forEach(async(user) => {
            const checkOutUsersConfig = {
                method: 'put',
                url: 'https://api.mytimestation.com/v1.2/employees/'+user+'/check-out',
                auth: {
                    username: timestationKey
                }
            }
            console.log(checkOutUsersConfig);
            console.log("checking out " + user);
            /*await axios.request(checkOutUsersConfig).catch((error) => {
                //res.status(400).json(error.response);
                res.status(400).json(error.response.data.error);
                return;
            });*/
            console.log("done");
        })
            res.json("Successfully checked out " + userIDsToCheckOut.length + " users!");
        
            /*axios.request(checkOutUsersConfig).then(resp => {
                console.log("done " + user)
            }).catch(error => {
                console.log("error");

            })
*/
        return;
    } catch (error) {
        console.log("penis" + error);
    }
})


var httpsServer = https.createServer(credentials, app);
httpsServer.listen("8443", () => {
    console.log("Starting proxy at port 4000")
});