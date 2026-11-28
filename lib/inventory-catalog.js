function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase();
}

const requiredColumns = [
  'Marca', 'Modelo', 'Año', 'Kilometraje', 'Transmisión', 'Combustible', 'Color',
  'Estado Comercial', 'Precio Venta', 'Publicar IA', 'Disponibilidad declarada SOAC'
];

export function publicInventory(headers, rows) {
  const normalizedHeaders = headers.map(normalize);
  const columns = new Map(requiredColumns.map(name => {
    const normalized = normalize(name);
    const index = normalizedHeaders.indexOf(normalized);
    if (index < 0 || normalizedHeaders.lastIndexOf(normalized) !== index) {
      throw new Error('Encabezado de inventario ausente o duplicado: ' + name);
    }
    return [name, index];
  }));

  const vehicles = [];
  for (const row of rows) {
    const read = name => String(row[columns.get(name)] ?? '').trim();
    if (normalize(read('Estado Comercial')) !== 'DISPONIBLE' ||
        normalize(read('Disponibilidad declarada SOAC')) !== 'DISPONIBLE REGISTRADO' ||
        normalize(read('Publicar IA')) !== 'SI') continue;

    const marca = read('Marca');
    const modelo = read('Modelo');
    const anio = read('Año');
    const precio = Number(read('Precio Venta').replace(/[$,\s]/g, ''));
    if (!marca || !modelo || !/^\d{4}$/.test(anio) || !Number.isFinite(precio) || precio <= 0) continue;

    vehicles.push({
      marca, modelo, anio: Number(anio), precio,
      kilometraje: read('Kilometraje'),
      transmision: read('Transmisión'),
      combustible: read('Combustible'),
      color: read('Color')
    });
  }
  return vehicles;
}
