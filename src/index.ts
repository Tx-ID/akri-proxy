
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
import express, { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import NodeCache from "node-cache";


//
const cache = new NodeCache({ stdTTL: 10 });
const app = express();

function getSubdomainFromRequest(req: express.Request): string | undefined {
    const match = req.path.match(/^\/([^\/]+)(?:\/|$)/);
    return match ? match[1] : undefined;
}

app.use((req, res: any, next) => {
    const cacheKey = req.method + req.originalUrl;
    const cached: {status: any, headers: any, body: any} | undefined = cache.get(cacheKey);
    if (cached) {
        return res.status(cached.status).set(cached.headers).send(cached.body);
    }
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

Object.entries(PROXY_ROUTES).forEach(([route, target]) => {
    app.use(
        route,
        createProxyMiddleware({
            target,
            changeOrigin: true,
            pathRewrite: (path, req) =>
                path.replace(new RegExp(`^${route}`), ""),
        }),
    );
});

const dynamicProxyCache = new Map<string, ReturnType<typeof createProxyMiddleware>>();

app.use((req, res, next) => {
    const match = req.path.match(/^\/([^\/]+)(?:\/(.*))?/);
    if (match) {
        const subdomain = match[1];
        if (!subdomain)
            return next();

        if (!dynamicProxyCache.has(subdomain)) {
            const proxy = createProxyMiddleware({
                target: `https://${subdomain}.roblox.com`,
                changeOrigin: true,
                pathRewrite: (path, req) => path.replace(/^\/[^\/]+/, "") || "/",
            });
            dynamicProxyCache.set(subdomain, proxy as any);
        }
        return dynamicProxyCache.get(subdomain)!(req, res, next);
    }
    next();
});

app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
});

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
