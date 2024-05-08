export type OmitDefaultsFromType<T, K extends string = ""> = Omit<
    T,
    "createdAt" | "updatedAt" | "id" | K
>
