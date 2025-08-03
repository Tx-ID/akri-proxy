
type ProxyRouteConfig = {
    [route: string]: string;
};

const SUBDOMAIN_CACHE_TTLS: { [subdomain: string]: number } = {
    // apis: 10,
    // users: 60,
    // assetdelivery: 2,
    // etc...

    friends: 30,
};
const PROXY_ROUTES: ProxyRouteConfig = {
    // "/apis": "https://apis.roblox.com",
    // "/assetdelivery": "https://assetdelivery.roblox.com",
    // "/users": "https://users.roblox.com",
};


//
require('events').EventEmitter.prototype._maxListeners = 100;

import type { Request, Response } from "express";

import { getRobloxCookie } from "./akribot";
import express from "express";
import cookieParser from 'cookie-parser';
import NodeCache from "node-cache";
import * as https from 'https';
import * as http from 'http';


//
const cache = new NodeCache({ stdTTL: 5 });
const app = express();
app.use(cookieParser());


// custom routing first.
function getSubdomainFromRequest(req: express.Request): string | undefined {
    const match = req.path.match(/^\/([^\/]+)(?:\/|$)/);
    return match ? match[1] : undefined;
}

app.use(async (req, res: Response & any, next) => {
    const cacheKey = req.method + req.originalUrl;
    const cached: {status: any, headers: any, body: any} | undefined = cache.get(cacheKey);
    if (cached) {
        return res.status(cached.status).set(cached.headers).send(cached.body);
    }
    
    const code = await getRobloxCookie();
    req.headers['cookie'] = `.ROBLOSECURITY=${code}`;

    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
        if (res.statusCode === 200) {
            const subdomain = getSubdomainFromRequest(req);
            const ttl = subdomain && SUBDOMAIN_CACHE_TTLS[subdomain] ? SUBDOMAIN_CACHE_TTLS[subdomain] : (cache.options.stdTTL ?? 5);

            cache.set(cacheKey, {
                status: res.statusCode,
                headers: res.getHeaders(),
                body,
            }, ttl);
        }
        return originalSend(body);
    };
    next();
});

// const dynamicProxyCache = new Map<string, ReturnType<typeof createProxyMiddleware>>();
app.use(async (req, res, next) => {
    // const match = req.path.match(/^\/([^\/]+)(?:\/(.*))?/);
    // if (match) {
    //     const subdomain = match[1];
    //     if (!subdomain || subdomain == '.well-known' || subdomain == "favicon.ico")
    //         return next();

    //     delete req.headers['roblox-id'];
    //     req.headers['user-agent'] = 'AKRI';

    //     if (!dynamicProxyCache.has(subdomain)) {
    //         const proxy = createProxyMiddleware({
    //             target: `https://${subdomain}.roblox.com`,
    //             changeOrigin: true,
    //             pathRewrite: (path, req) => path.replace(/^\/[^\/]+/, "") || "/",
    //             on: {
    //                 error: (err, req, res, target) => {
    //                     return res.redirect('https://www.youtube.com/watch?v=C9i5SUDWls0');
    //                 }
    //             },
    //         });
    //         dynamicProxyCache.set(subdomain, proxy as any);
    //     }

    //     return dynamicProxyCache.get(subdomain)!(req, res, next);
    // }
    // next();

    const match = req.path.match(/^\/([^\/]+)(?:\/(.*))?/);
    if (match) {
        const subdomain = match[1];
        const restOfPath = match[2] || "";

        if (!subdomain || subdomain === '.well-known' || subdomain === "favicon.ico") {
            return next();
        }
        const queryIdx = req.url.indexOf('?');
        const query = queryIdx !== -1 ? req.url.slice(queryIdx) : "";
        const targetPath = `/${restOfPath}${query}`;

        console.log(targetPath);

        delete req.headers['roblox-id'];
        req.headers['user-agent'] = 'AKRI';

        const targetHost = `${subdomain}.roblox.com`;

        const proxyHeaders: http.OutgoingHttpHeaders = { ...req.headers };
        const hopByHopHeaders = [
            'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
            'te', 'trailer', 'transfer-encoding', 'upgrade'
        ];
        hopByHopHeaders.forEach(header => {
            const lcHeader = header.toLowerCase();
            if (proxyHeaders[lcHeader]) {
                delete proxyHeaders[lcHeader];
            }
        });
        if (proxyHeaders['host']) {
            delete proxyHeaders['host'];
        }

        const options: https.RequestOptions = {
            method: req.method,
            host: targetHost,
            path: targetPath,
            headers: proxyHeaders,

            // Optionally, if you need to disable SSL verification:
            // rejectUnauthorized: false,
        };

        const proxyReq = https.request(options, (proxyRes) => {
            for (const header in proxyRes.headers) {
                if (proxyRes.headers.hasOwnProperty(header)) {
                    const headerValue = proxyRes.headers[header];
                    if (headerValue !== undefined) {
                        res.setHeader(header, headerValue);
                    }
                }
            }
            res.writeHead(proxyRes.statusCode || 500);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error(`Proxy request error for ${subdomain}.roblox.com${targetPath}:`, err);
            if (!res.headersSent) {
                return res.redirect('https://www.youtube.com/watch?v=C9i5SUDWls0');
            }
        });

        req.pipe(proxyReq);
    } else {
        next();
    }
});

app.use((req: Request, res: Response) => {
    return res.redirect('https://www.youtube.com/watch?v=C9i5SUDWls0');
});


// the real thing.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`listening on http://localhost:${PORT}`);
    Object.entries(PROXY_ROUTES).forEach(([route, target]) => {
        console.log(`  Proxying ${route}/* => ${target}`);
    });
    console.log(
        `  Proxying /X/* => https://X.roblox.com/* (dynamic catch-all)`,
    );
});
