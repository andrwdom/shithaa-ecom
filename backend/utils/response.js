export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
        success: true,
        data,
        message
    });
};

export const errorResponse = (res, message = 'Error occurred', statusCode = 500) => {
    res.status(statusCode).json({
        success: false,
        message
    });
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