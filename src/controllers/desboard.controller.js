export async function getDashboardTransactions(req, res) {
  try {
    const {
      fromDate,
      toDate,
      type,
      page = 1,
      limit = 10,
    } = req.query;

    const cleanType =
      type && type !== 'All' ? type : undefined;

    const data = await getAllTransactionHistoryService({
      fromDate,
      toDate,
      type: cleanType,
      page: Number(page),
      limit: Number(limit),
    });

    const total = await getAllTransactionCountService({
      fromDate,
      toDate,
      type: cleanType,
    });

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        totalPage: Math.ceil(total / Number(limit)),
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: err.message,
      error: "Failed to fetch dashboard transactions",
    });
  }
}
