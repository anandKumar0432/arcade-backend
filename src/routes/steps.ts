import express, { Router } from "express";
const router: Router = express.Router();
import { PrismaClient } from "@prisma/client";
import { auth } from "../middleware/middleware.js";
import { z } from "zod"
const prisma = new PrismaClient();


const updateStepSchema = z.object({
  order: z.number().optional(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  annotation: z.string().optional(),
  hotspot: z.any().optional() // could be refined as a JSON schema
});

type updateStep = z.infer<typeof updateStepSchema>;

router.patch("/:stepId", auth, async (req: any, res) => {
    try{
        const body  = req.body;
        const parseResult : updateStep = updateStepSchema.parse(body);
        if(!parseResult){
            res.status(400).json({
                error: "Invalid update data",
            })
        }
        const step = await prisma.step.update({ 
            where: { id: req.params.stepId }, 
            data: body 
        });
        res.json(step);
    }catch(e){
        res.status(500).json({
            error: "internal server error"
        })
    }
});

router.delete("/:stepId", auth, async (req, res) => {
  try{
    await prisma.step.delete({ where: { id: req.params.stepId } });
    res.status(204).end();
  }catch(e){
    res.status(500).json({
        error: "internal server error"
    })
  }
});

export default router;