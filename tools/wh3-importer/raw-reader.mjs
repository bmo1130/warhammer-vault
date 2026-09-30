export function namedRows(fields, cells) {
  if (!Array.isArray(fields) || !Array.isArray(cells)) throw new Error('Invalid RPFM processed fields or table data.');
  const names = fields.map((field) => field.name);
  if (names.some((name) => typeof name !== 'string' || !name) || new Set(names).size !== names.length) throw new Error('Invalid or duplicate RPFM field names.');
  return cells.map((row) => {
    if (!Array.isArray(row) || row.length !== names.length) throw new Error('RPFM row width differs from processed schema. Refusing positional guesses.');
    // Only the transport adapter zips cells with schema-provided names.
    // All discovery, joins and reports operate on named fields, never offsets.
    return Object.fromEntries(names.map((name, position) => {
      const cell = row[position];
      if (!cell || typeof cell !== 'object' || Object.keys(cell).length !== 1) throw new Error(`Unexpected RPFM typed cell for ${name}`);
      return [name, Object.values(cell)[0]];
    }));
  });
}

export class RawPackReader {
  constructor(client) { this.client = client; this.packs = []; this.cache = new Map(); }

  async open(file) {
    const opened = await this.client.call('open_packfiles', { paths: [file] });
    const [key, info] = opened.StringContainerInfo ?? [];
    if (!key || !['Release', 'Patch'].includes(info?.pfh_file_type)) throw new Error(`Expected CA Release/Patch pack: ${file}`);
    const metadata = await this.client.call('open_pack_info', { pack_key: key });
    const [, files] = metadata.ContainerInfoVecRFileInfo ?? [];
    if (!Array.isArray(files)) throw new Error('Installed RPFM returned an unsupported pack inventory.');
    const pack = { key, info, files };
    this.packs.push(pack);
    return pack;
  }

  async decode(pack, path) {
    const cacheKey = `${pack.key}:${path}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    const decoded = await this.client.call('decode_packed_file', { pack_key: pack.key, path, source: 'PackFile' });
    const pair = decoded.DBRFileInfo ?? decoded.LocRFileInfo;
    if (!pair) throw new Error(`RPFM cannot decode table ${path}; check WH3 schema/version.`);
    const [content] = pair;
    const table = content.table;
    if (!table?.definition || !Array.isArray(table.table_data)) throw new Error(`Unsupported RPFM decoded table: ${path}`);
    const processed = await this.client.call('fields_processed', { definition: JSON.stringify(table.definition) });
    if (!Array.isArray(processed.VecField)) throw new Error('RPFM fields_processed did not return named fields.');
    const result = {
      table: table.table_name, path, sourcePack: pack.info.file_name,
      sourcePackPath: pack.info.file_path, tableVersion: table.definition.version,
      fields: processed.VecField, rows: namedRows(processed.VecField, table.table_data),
    };
    this.cache.set(cacheKey, result);
    return result;
  }

  async tables(name) {
    const paths = this.packs.flatMap((pack) => pack.files.filter((file) => file.file_type === 'DB' && file.path.split('/')[1] === name).map((file) => ({ pack, path: file.path })));
    const decoded = [];
    for (const { pack, path } of paths) decoded.push(await this.decode(pack, path));
    return decoded;
  }
}
