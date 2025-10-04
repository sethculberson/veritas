interface People {
    name: string,
    integrityScore: number,
    title: string,
}

interface ApiResponse {
    company: number,
    people: People[],
}