type SourceID = string;

type VersionVector = Map<SourceID, number>;


const version_vector_forward = (version_vector: VersionVector, source: SourceID) => {
    const new_version_vector = new Map(version_vector);
    new_version_vector.set(source, (new_version_vector.get(source) || 0) + 1);
    return new_version_vector;
}

const version_vector_merge = (version_vector1: VersionVector, version_vector2: VersionVector) => {
    const new_version_vector = new Map(version_vector1);
    version_vector2.forEach((value, source) => {
        new_version_vector.set(source, Math.max(new_version_vector.get(source) || 0, value));
    });
    return new_version_vector;
}

const version_vector_compare = (version_vector1: VersionVector, version_vector2: VersionVector) => {
    const keys = new Set([...version_vector1.keys(), ...version_vector2.keys()]);
    for (const key of keys) {
        const value1 = version_vector1.get(key) || 0;
        const value2 = version_vector2.get(key) || 0;
        if (value1 < value2) {
            return -1;
        }
        else if (value1 > value2) {
            return 1;
        }
    }
    return 0;
}

