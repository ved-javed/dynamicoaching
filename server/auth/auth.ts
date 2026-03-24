import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "../storage";
import { type User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "tuition-track-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Ensure default admin exists
  (async () => {
    const admin = await storage.getUserByUsername("dynamic");
    if (!admin) {
      const hashedPassword = await bcrypt.hash("dcc2020", 10);
      await storage.createUser({
        username: "dynamic",
        password: hashedPassword,
        role: "admin"
      });
    }
  })();

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        let user = await storage.getUserByUsername(username);
        
        // If user not found by username, they might be a student trying to login with Student ID
        // or a teacher trying to login with Teacher ID
        if (!user) {
          // Check for Student ID
          const allStudents = await storage.getStudents();
          const student = allStudents.find(s => s.studentCustomId === username);
          if (student && student.userId) {
            user = await storage.getUser(student.userId);
          }

          // Check for Teacher ID if still not found
          if (!user) {
            const allUsers = await storage.getUsers(); // We need a way to get all users or specifically search by teacherId
            user = allUsers.find((u: any) => u.teacherId === username);
          }

          if (!user) {
            return done(null, false, { message: "Invalid username or password" });
          }
        }

        // Check password
        const isPasswordMatch = password === user.password || await bcrypt.compare(password, user.password);
        
        if (!isPasswordMatch) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });

  app.post("/api/register", async (req, res) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = await storage.createUser({
      ...req.body,
      password: hashedPassword,
    });
    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: "Login after registration failed" });
      res.status(201).json(user);
    });
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
