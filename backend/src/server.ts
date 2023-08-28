import http from "http";
import express, { Express } from "express";
import morgan from "morgan";
import apicache from "apicache";
import routes from "./routes/social-network-routing";
import { cacheTtlInMillis } from "./services/utils/Resources";
import { initializeDatabase } from "./services/database/db";

const router: Express = express();

initializeDatabase();

router.use(morgan("dev"));
const cache = apicache.middleware;

// Using a cache of cacheTtlInMillis to improve performance.
router.use(cache(cacheTtlInMillis));

router.use(express.urlencoded({ extended: false }));
router.use(express.json());

router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "origin, X-Requested-With,Content-Type,Accept, Authorization"
    );
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "GET");
        return res.status(200).json({});
    }
    next();
});

router.use("/", routes);

router.use((_req, res, _next) => {
    const error = new Error("not found");
    return res.status(404).json({
        message: error.message
    });
});

const httpServer = http.createServer(router);
const PORT = 4000;
httpServer.listen(PORT, () =>
    console.log(`The server is running on port ${PORT}`)
);