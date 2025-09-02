import express, { Router } from 'express';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const router: Router = express.Router();
import { PrismaClient } from '@prisma/client';
import { signAccess } from '../middleware.js';
import { auth } from '../middleware.js';
const prisma = new PrismaClient();

const signUpSchema = z.object({
  name: z.string().optional(),
  email: z.email(),
  password: z.string(),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

type SignUpData = z.infer<typeof signUpSchema>;
type LoginData = z.infer<typeof loginSchema>;


router.post('/register', async (req, res) => {
  console.log("i am in register routes")
  try {
    const body: SignUpData = req.body;
    const parseResult = signUpSchema.safeParse(body);
    if (!parseResult.success) {
      return res.status(400).json({ errors: parseResult.error.issues });
    }
    console.log("above the user found");
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });
    console.log("user found");
    if (user) {
      return res.status(400).json({ message: 'Email already in use' });
    }
     console.log("user already found");
    let passwordHash = '';
    try {
      passwordHash = await bcrypt.hash(body.password, 10);
    } catch (error) {
      return res.status(500).json({ message: 'Error hashing password' });
    }
    const newUser = await prisma.user.create({
      data: {
        name: body.name ?? '',
        email: body.email,
        passwordHash: passwordHash,
      },
    });
    const accessToken = signAccess({
      sub: newUser.id, role: newUser.role
    });
    res.json({
      accessToken, user: {
        id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const body: LoginData = req.body;
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return res.status(400).json({ errors: parseResult.error.issues });
    }
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });
    const decodedPassword = await bcrypt.compare(body.password, user?.passwordHash ?? '');
    if (!user || !decodedPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const accessToken = signAccess({ sub: user.id, role: user.role });
    res.json({
      accessToken, user: {
        id: user.id, name: user.name, email: user.email, role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get("/me", auth, async (req: any, res) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const id = req.user.sub;
    const me = await prisma.user.findUnique({
      where: { id: id }
    });
    res.json({
      id: me?.id, name: me?.name, email: me?.email, role: me?.role
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;