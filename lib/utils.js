const flat = (arr1) => arr1.reduce((acc, val) => acc.concat(val), []);
const deepEqual = (x, y) => {
        const ok = Object.keys, tx = typeof x, ty = typeof y;
        return x && y && tx === 'object' && tx === ty ? (
          ok(x).length === ok(y).length &&
            ok(x).every(key => deepEqual(x[key], y[key]))
        ) : (x === y);
}

export { flat, deepEqual };