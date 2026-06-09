import { Router } from "express";
import { createOrder } from "../controllers/paymentController.js";


export const paymentRouter = Router();

// Endpoint: /api/payment/create-order
paymentRouter.post("/create-order", createOrder);
