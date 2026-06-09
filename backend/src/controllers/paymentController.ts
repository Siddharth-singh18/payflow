import { Request, Response } from "express";
import { razorpay } from "../config/razorpay.js";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const options = {
      amount: 500 * 100, // 500 INR in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);

    res.status(500).json({
      success: false,
      message: "Order creation failed",
    });
  }
};
