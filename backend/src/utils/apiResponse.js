const invalidId = (res) => res.status(400).json({
    message: 'Érvénytelen azonosító.'
});

const invalidYearMonth = (res) => res.status(400).json({
    message: 'Érvényes évet és hónapot kell megadni.'
});

const unknownMasterData = (res) => res.status(400).json({
    message: 'Ismeretlen törzsadat.'
});

const employeeAccessDenied = (res) => res.status(403).json({
    message: 'Ehhez a dolgozóhoz nincs hozzáférése.'
});

const employeeNotFound = (res) => res.status(404).json({
    message: 'A dolgozó nem található.'
});

const serverError = (res, context, error) => {
    console.error(`${context}:`, error);

    return res.status(500).json({ message: 'Szerver hiba.' });
};

module.exports = {
    invalidId,
    invalidYearMonth,
    unknownMasterData,
    employeeAccessDenied,
    employeeNotFound,
    serverError
};
