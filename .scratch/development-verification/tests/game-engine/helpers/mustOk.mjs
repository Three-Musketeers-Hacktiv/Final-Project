export function mustOk(result) {
    if (!result.ok) {
        throw new Error(`${result.error.code}: ${result.error.message}`);
    }
    return result.state;
}
