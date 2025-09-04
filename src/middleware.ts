import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const signAccess = (payload: object) =>
  jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "60m" });

export const auth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if(!authHeader || !authHeader.startsWith('Bearer ')){
    return res.status(401).json({ error: "unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT secret not configured" });
    }
    req.user  = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
};

export const requireOwner = (getTourId: (req: any) => string) => {
  return async (req: any, res: any, next: any) => {
    try {
      const tourId = getTourId(req);
      console.log("tourId:", tourId);
      const tour = await prisma.tour.findUnique({
        where: { id: tourId }
      });
      if (!tour) {
        return res.status(404).json({ error: "tour not found" });
      }
      console.log(tour.ownerId, req.user.sub, req.user.role);
      
      if (tour.ownerId !== req.user.sub || req.user.role !== "ADMIN") {
        console.log("owner not verified");
        return res.status(403).json({ error: "forbidden" });
      }
      console.log("owner verified");
      next();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  };
};