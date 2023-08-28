import { Request, Response, NextFunction } from "express";
import { computeFeed } from "../services/feedService";

const getFeed = async (req: Request, res: Response, _next: NextFunction) => {
    const idParameter = req.query.id;
    if (typeof idParameter !== "string") {
        return res.status(500).json("Error parsing the query parameter.");
    }

    const id = +idParameter;

    // Accept only positive values
    if (Number.isNaN(id) || id <= 0) {
        return res.status(400).json("Bad request.");
    }
    try {
        const result = await computeFeed(id);
        
        return res.status(200).json(result);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json(error.message);
        }
        return res.status(500).json("Unknown Error.");
    }
};

export default { getFeed };