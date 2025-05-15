import express, { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

type ProxyRouteConfig = {
    [route: string]: string;
};

const PROXY_ROUTES: ProxyRouteConfig = { // only use for other domains
    "/apis": "https://apis.roblox.com",
    "/assetdelivery": "https://assetdelivery.roblox.com",
    "/users": "https://users.roblox.com",
};

const app = express();

Object.entries(PROXY_ROUTES).forEach(([route, target]) => {
    app.use(
        route,
        createProxyMiddleware({
            target,
            changeOrigin: true,
            pathRewrite: (path, req) => path.replace(new RegExp(`^${route}`), ''),
        })
    );
});

app.use(
    /^\/([^\/]+)\/(.*)/,
    (req, res, next) => {
        const match = req.path.match(/^\/([^\/]+)\/(.*)/);
        if (match) {
            const subdomain = match[1];
            const target = `https://${subdomain}.roblox.com`;

            return createProxyMiddleware({
                target,
                changeOrigin: true,
                pathRewrite: (path, req) => {
                    return path.replace(/^\/[^\/]+/, '');
                },
            })(req, res, next);
        }
        next();
    }
);

app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`listening on http://localhost:${PORT}`);
    Object.entries(PROXY_ROUTES).forEach(([route, target]) => {
        console.log(`  Proxying ${route}/* => ${target}`);
    });
    console.log(`  Proxying /X/* => https://X.roblox.com/* (dynamic catch-all)`);
});
