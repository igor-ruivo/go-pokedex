import { Request, Response, NextFunction } from "express";
import { computeFeed } from "../services/feedService";

const getFeed = async (req: Request, res: Response, _next: NextFunction) => {
    try {
        const result = await computeFeed();
        
        return res.status(200).json(result);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json(error.message);
        }
        return res.status(500).json("Unknown Error.");
    }
};

export default { getFeed };