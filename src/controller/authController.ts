import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User, UserRepository } from '../presistens/user_repository.js';
import { NextFunction, Request, Response } from 'express';

declare global {
    namespace Express {
      interface Request {
        user?: User;
      }
    }
  }

const userRepo = await UserRepository.create();

export const getLogin = async (req : Request, res : Response) : Promise<void> => {
    res.render('pages/auth/login');
};

export const getRegister = async (req : Request, res : Response) : Promise<void> => {
  const data = {openForRegistration : process.env.ALLOW_REGISTRATION == "true"};
  res.render('pages/auth/register', data);
}

export const postlogin = async (req : Request, res : Response) : Promise<void> => {
    try {

      const { email, password } = req.body;

      if(!email || !password) {
        res.status(401).json({ message: 'Incorrect email or password' });
        return;
      }

      // Find the user with the given username
      let user;

      try {
        user = await userRepo.find(email);
      } catch (err) { 
        res.status(401).json({ message: 'Incorrect email or password' });
        return;
      }
  
      // Compare the provided password with the hashed password in the database
      const isMatch = await bcrypt.compare(password, user.password);
      // If the passwords don't match, return an error
      if (!isMatch) {
        res.status(401).json({ message: 'Incorrect email or password' });
        return;
      }
  
      // Generate a JWT token
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
      

      //res.cookie('token', token, { httpOnly: true });
      // Return the token and user object
      res.json({ token, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };


  export const postRegister = async (req : Request, res : Response) : Promise<void> => {
    try {

      if(process.env.ALLOW_REGISTRATION == "false" || !process.env.ALLOW_REGISTRATION) {
        res.status(401).json({ message: 'Registration is closed' });
        return;
      }

      // Find the user with the given username
      try {
        const user = await userRepo.find(req.body.email);

        if(user) {
          res.status(401).json({ message: 'Incorrect email' });
          return;
        }
      } catch (err) {}
  
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
  
      const savedUser = await userRepo.save({ email: req.body.email, password: hashedPassword });
      
      // Generate a JWT token
      const token = jwt.sign({ id: savedUser.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });

      res.json({ token, savedUser });

      
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  export const authenticateMiddleware = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    try {
      // Get the token from the Authorization header
      let token = req.headers.authorization?.split(' ')[1];
  
      // If there is no token, check if there is a cookie instead
      if (!token) {
        try {
          token = req.cookies.token;
        } catch (err) {}
        

        if(!token) {

        res.status(401).json({ message: 'Authentication required' });
        return;
        }
      }
  
      // Verify the token and get the user ID from the payload
      try {
        const { id } = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

        // Find the user with the given ID
        const user = await userRepo.findByID(parseInt(id));
    
        // Set the req.user property to the authenticated user
        req.user = user;
        
        // If the user doesn't exist, return an error
        if (!user) {
          res.status(401).json({ message: 'Authentication required' });
          return;
        }
      } catch (err) {
        // If the token is expired, return an error
        if (err instanceof jwt.TokenExpiredError) {
          res.status(401).json({ message: 'Authentication expired' });
          return;
        }
        // If the token is invalid, return an error
        if (err instanceof jwt.JsonWebTokenError) {
          res.status(401).json({ message: 'Authentication invalid' });
          return;
        }
        // For any other errors, return an error
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      // Call the next middleware function
      next();

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  export async function isLoggedIn(token : string| undefined) : Promise<boolean> {
      try {
        if(!token) {
          return false;
        }
        const { id } = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        const user = await userRepo.findByID(parseInt(id));
        return Boolean(user);
      } catch (err) {
        return false;
      }
  }