import express, { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { auth } from '../middleware/middleware.js';
import { requireOwner } from '../middleware/middleware.js';
import dotenv from 'dotenv';
dotenv.config();
const router: Router = express.Router();
import { z } from 'zod';
import { randomBytes } from 'crypto';

const tourDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  coverImageUrl: z.string().optional(),
});

type TourData = z.infer<typeof tourDataSchema>;

router.get("/", auth, async (req: any, res) => {
  try {
    const tours = await prisma.tour.findMany({ 
    where: {
        ownerId: req.user.sub 
    }, 
    include: { 
        steps: true 
    } 
    });

    if (!tours) {
      return res.status(404).json({ error: "No tours found" });
    }

    res.json(tours);
  }catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }

});
router.post("/create", auth, async (req: any, res) => {
  try {
    const body = req.body;
    const parseResult = tourDataSchema.safeParse(body); 
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid tour data", 
        details: parseResult.error.issues 
      });
    }
    const { title, description, coverImageUrl } = parseResult.data;
    const tour = await prisma.tour.create({
      data: { 
        title: title, 
        description: description ?? "", 
        coverImageUrl: coverImageUrl ?? "", 
        ownerId: req.user.sub 
      },
    });
    res.status(201).json(tour);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", auth, requireOwner(r => r.params.id), async (req, res) => {
  console.log("i am in get tour by id");
  try {
    const tour = await prisma.tour.findUnique({ 
      where: { id: req.params.id },
      include: {  
        steps: { orderBy: { order: "asc" } }
      }
    });
    if (!tour) {
      return res.status(404).json({ error: "Tour not found" });
    }
    res.json(tour);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", auth, requireOwner(r => r.params.id), async (req, res) => {
  try {
    const body: TourData = req.body;
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.coverImageUrl !== undefined) updateData.coverImageUrl = body.coverImageUrl;

    const parseResult = tourDataSchema.partial().safeParse(body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid tour data", 
        details: parseResult.error.issues 
      });
    }
    const tour = await prisma.tour.update({ 
      where: { id: req.params.id },
      data: updateData
    });
    res.json(tour);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", auth, requireOwner(r => r.params.id), async (req, res) => {
    try {
        const tour = await prisma.tour.findUnique({ where: { id: req.params.id } });
        if (!tour) {
            return res.status(404).json({ error: "Tour not found" });
        }
        await prisma.tour.delete({ where: { id: req.params.id } });
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

export const stepDataSchema = z.object({
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  annotation: z.string().optional(),
  order: z.number().optional(),
  hotspot: z.string().optional(),
});

export type StepData = z.infer<typeof stepDataSchema>;

router.post("/api/tours/:id/steps", auth, requireOwner(r => r.params.id), async (req, res) => {
  try {
    const body = req.body;
    const parseResult = stepDataSchema.safeParse(body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid step data",
        details: parseResult.error.issues
      });
  }
  const step = await prisma.step.create({
    data: {
      tourId: req.params.id,
      imageUrl: body.imageUrl,
      videoUrl: body.videoUrl,
      annotation: body.annotation,
      order: body.order ?? 0,
      hotspot: body.hotspot ?? ""
    },
  });
  res.status(201).json(step);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/publish", auth, requireOwner(r => r.params.id), async (req, res) => {
  try{
    const shareId = randomBytes(8).toString("hex");
    const tour = await prisma.tour.update({
      where: { 
        id: req.params.id 
      },
      data: {
        isPublic: true, 
        shareId 
      } 
    });

    res.status(200).json({ 
      shareId: tour.shareId 
    });
  }catch(e){
    res.status(500).json({
      error: "Internal server error"
    })
  }
});

router.post("/:id/unpublish", auth, requireOwner(r => r.params.id), async (req, res) => {
  try{
    await prisma.tour.update({
    where: {
      id: req.params.id
    },
    data: {
      isPublic: false,
      shareId: null
    }
  });
  res.status(204).end();
  }catch(e){
    res.status(500).json({
      error: "Internal server error"
    })
  }
});

router.get("/:id/analytics", auth, requireOwner(r => r.params.id), async (req, res) => {
  try{
     const [views, completes] = await Promise.all([
    prisma.analyticsEvent.count({ where: { tourId: req.params.id, type: 'VIEW' } }),
    prisma.analyticsEvent.count({ where: { tourId: req.params.id, type: 'COMPLETE' } }),
    ]);
    res.json({ views, completes });
  }catch(e){
    res.status(500).json({
      error : "Internal server error"
    })
  }
});

export default router;