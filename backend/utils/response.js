export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
        success: true,
        data,
        message
    });
};

export const errorResponse = (res, statusCode = 500, message = 'Error occurred', extraData = null) => {
    const response = {
        success: false,
        message
    };
    
    if (extraData) {
        response.error = extraData;
    }
    
    res.status(statusCode).json(response);
};

export const paginatedResponse = (res, data, total, page, totalPages, message = 'Success') => {
    res.json({
        success: true,
        data,
        total,
        page: Number(page),
        totalPages,
        message
    });
}; 