import jwt from 'jsonwebtoken'

const adminAuth = async (req, res, next) => {
    try {
        const token = req.headers.token;
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Not Authorized - No token provided" 
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            if (!decoded || decoded.role !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: "Not Authorized - Admin access required" 
                });
            }

            req.user = decoded;
            next();
        } catch (jwtError) {
            console.error('JWT Verification Error:', jwtError);
            return res.status(401).json({ 
                success: false, 
                message: "Not Authorized - Invalid token" 
            });
        }
    } catch (error) {
        console.error('Admin Auth Error:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
}

export default adminAuth;