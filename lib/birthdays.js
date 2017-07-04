const fs = require('fs');
const google = require('googleapis');
const googleAuth = require('google-auth-library');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-token.json';
const moment = require('moment-timezone');

module.exports = {};
module.exports.getTodaysBirthdays = callback => {
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.error('No client secret found.')
            return;
        }
        authorize(JSON.parse(content), callback);
    });
}

function authorize(credentials, callback) {
    const clientSecret = credentials.installed.client_secret;
    const clientId = credentials.installed.client_id;
    const redirectUrl = credentials.installed.redirect_uris[0];
    const auth = new googleAuth();
    let oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            console.error('No token found in ~/.credentials')
        } else {
            oauth2Client.credentials = JSON.parse(token);
            listBirthdays(oauth2Client, callback);
        }
    });
}

function listBirthdays(auth, callback) {
    var sheets = google.sheets('v4');
    sheets.spreadsheets.values.get({
        auth: auth,
        spreadsheetId: '1C33ZNxv395UU5HiQx-CinabX2UGjT68-wC99kh9x3nU',
        range: "reponses_pour_bot!B2:D130",
    }, function(err, response) {
        if (err) {
            console.error('The API returned an error: ' + err);
            return;
        }
        let rows = response.values;
        callback(filterBirthdays(rows))
    });
}

function filterBirthdays(bd) {
    const date = moment().tz('Europe/Paris');
    console.log('Now is ' + date.format())
    return bd.filter(row => {
        let [day, month, year] = row[1].split('/').map(e => parseInt(e));
        return date.getDate === day && date.getMonth() === month - 1 && date.getFullYear() === year;
    });
}
