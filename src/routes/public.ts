import express,{ Router } from "express"
import { PrismaClient } from "@prisma/client";
import { z } from "zod"
const router:Router = express.Router();
const prisma = new PrismaClient();

router.get("/tours/:shareId", async (req, res) => {
  try{
    const tour = await prisma.tour.findFirst({ 
    where: { 
        shareId: req.params.shareId, 
        isPublic: true 
    },
    include: { 
        steps: { 
            orderBy: { 
                order: "asc" 
            }
        }
    }
  });
    if (!tour) return res.status(404).json({ error: "not found" });
    res.json(tour);
  }catch(e){
    res.status(500).json({
        error : "Internal server error"
    })
  }
});

const eventSchema = z.object({
  type: z.enum(["VIEW", "NEXT", "PREV", "CLICK", "COMPLETE"]),
  stepId: z.string().optional(),
  referrer: z.string().optional(),
  sessionId: z.string().optional()
});

type EventInput = z.infer<typeof eventSchema>;

router.post("/tours/:shareId/events", async (req, res) => {
  try{
    const tour = await prisma.tour.findFirst({ 
        where: { 
            shareId: req.params.shareId, 
            isPublic: true 
        } 
    });
    if (!tour) return res.status(404).json({ error: "not found" });
    const body = req.body;
    const parseResult : EventInput = eventSchema.parse(body);
    if(!parseResult){
        res.json(400).json({
            error : "Wrong input"
        })
    }
    const analyticsEvent = await prisma.analyticsEvent.create({
        data: {
            tourId: tour.id,
            stepId: body.stepId ?? null ,
            type: body.type,
            referrer: body.referrer ?? null,
            sessionId: body.sessionId ?? null,
            ipHash: String(req.ip)
        }
    });
    res.status(201).end();
  }catch(e){
    res.status(500).json({
        error : "Internal server error"
    })
  }
});
export default Router;