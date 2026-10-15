export const protect = (req, res, next) => {
    if (req.session && req.session.userId) {
        req.user = {
            id: req.session.userId,
            pharmacyId: req.session.pharmacyId,
            role: req.session.role
        };
        next();
    } else {
        res.status(401).json({ message: 'Not authorized, session expired or missing' });
    }
};

export const requireRoles = (roles) => {
    return (req, res, next) => {
        if (req.user && roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ message: 'Forbidden: access denied' });
        }
    };
};
