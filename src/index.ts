
var port = process.env.PORT || 3000;

import https from "https";
import express from "express";
import proxy from "http-proxy";
import cookieParser from "cookie-parser";
import { getRobloxCookie } from "./akribot.js";

var httpsProxy = proxy.createProxyServer({
    agent: new https.Agent({
        checkServerIdentity: function (host, cert) {
            return undefined;
        },
    }),
    changeOrigin: true,
});

httpsProxy.on("proxyReq", (proxyReq, req, res, options) => {
    // console.log(options);
    // console.log(req.headers);

    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36');
    proxyReq.removeHeader('roblox-id');
});


//
var app = express();
app.use( cookieParser() );

app.use(async (req, res, next) => {
    const match = req.path.match(/^\/([^\/]+)(\/.*)?$/);
    if (!match) return next();

    let subdomain = match[1];
    let restOfPath = match[2] || '/';

    if (!subdomain) {
        return next();
    }
    if (subdomain === '.well-known' || subdomain === "favicon.ico")
        return next();

    if (
        req.originalUrl.indexOf('?') !== -1
        && restOfPath.indexOf('?') === -1
    ) {
        restOfPath += req.originalUrl.slice(req.originalUrl.indexOf('?'));
    }

    const code = await getRobloxCookie();
    req.headers['cookie'] = `.ROBLOSECURITY=${code}`;

    var proto = subdomain === 'wiki.' ? 'http' : 'https';
    let target = proto + '://' + subdomain + '.roblox.com';
    req.url = restOfPath;

    httpsProxy.web(req, res, {
        target
    });
});

app.listen(port, function () {
    console.log("Listening on port " + port);
});
