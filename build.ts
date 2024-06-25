;(async () => {
    await Bun.build({
        entrypoints: ["./src/"],
        outdir: "./dist",
        target: "bun",
        minify: true,
    })
})()

export {}
