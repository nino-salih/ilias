const loaderOption = process.env.NODE_OPTIONS?.includes('--loader ts-node/esm') ?? false;
const tsNode = process.argv[0].includes('ts-node') || process.argv[1].includes('ts-node');





const typeScriptSupport = loaderOption || tsNode;

export { typeScriptSupport };