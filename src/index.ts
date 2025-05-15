import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

type ProxyRouteConfig = {
    [route: string]: string;
};

const PROXY_ROUTES: ProxyRouteConfig = {
    "/apis": "https://apis.roblox.com",
    "/assetdelivery": "https://assetdelivery.roblox.com",
    "/users": "https://users.roblox.com",
    // Add more routes as desired
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

app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`listening on http://localhost:${PORT}`);
    Object.entries(PROXY_ROUTES).forEach(([route, target]) => {
        console.log(`  Proxying ${route}/* => ${target}`);
    });
});
