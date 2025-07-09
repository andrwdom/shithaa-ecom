import jwt from 'jsonwebtoken'
import userModel from '../models/userModel.js'

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        req.user = user;
        req.user.id = user._id.toString();
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

const isAdmin = async (req, res, next) => {
    const { token } = req.headers;

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not Authorized - No token provided' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Not Authorized - Admin access required' 
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.log('Admin Auth Error:', error);
        return res.status(401).json({ 
            success: false, 
            message: 'Not Authorized - Invalid token' 
        });
    }
}

const optionalVerifyToken = async (req, res, next) => {
    try {
        const token = req.headers.token;
        if (!token) {
            req.user = null;
            return next();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id);
        req.user = user || null;
        if (req.user) req.user.id = req.user._id.toString();
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

export { verifyToken, isAdmin, optionalVerifyToken }