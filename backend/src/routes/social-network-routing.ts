import express from "express";
import controller from "../controllers/social-network";

const router = express.Router();
router.get("/feed", controller.getFeed);

export = router;