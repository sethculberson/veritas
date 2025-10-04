export interface People {
    name: string,
    integrityScore: number,
    title: string,
}
export interface ApiResponse {
    overallScore: number,
    people: People[],
}