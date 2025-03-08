import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = 'https://ensskboilsdojtbsnhho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuc3NrYm9pbHNkb2p0YnNuaGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3MDg1MDgsImV4cCI6MjA1NjI4NDUwOH0.tQiaVgAFj9GlNcPMV_s5lVZ3JhxFuVkLbkVqLIJtgwU';
const supabase = createClient(supabaseUrl, supabaseKey);

let trabajadores = [];

// Elementos del DOM
const formTrabajador = document.getElementById('formTrabajador');
const formRegistro = document.getElementById('formRegistro');
const tablaRegistros = document.getElementById('tablaRegistros').querySelector('tbody');
const tablaResumen = document.getElementById('tablaResumen').querySelector('tbody');
const tablaTrabajadores = document.getElementById('tablaTrabajadores').querySelector('tbody');

// Cargar trabajadores
async function cargarTrabajadores() {
  const { data, error } = await supabase.from('trabajadores').select('*');
  if (error) {
    console.error('Error al cargar trabajadores:', error);
  } else {
    trabajadores = data;
    const listaTrabajadores = document.getElementById('listaTrabajadores');
    listaTrabajadores.innerHTML = ''; // Limpiar la lista antes de llenarla
    tablaTrabajadores.innerHTML = ''; // Limpiar la tabla de trabajadores

    trabajadores.forEach(trabajador => {
      // Agregar a la lista de trabajadores para registrar
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `trabajador-${trabajador.id}`;
      checkbox.value = trabajador.id;

      const label = document.createElement('label');
      label.htmlFor = `trabajador-${trabajador.id}`;
      label.textContent = trabajador.nombre;

      listaTrabajadores.appendChild(checkbox);
      listaTrabajadores.appendChild(label);
      listaTrabajadores.appendChild(document.createElement('br')); // Salto de línea

      // Agregar a la tabla de trabajadores
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${trabajador.nombre}</td>
        <td>${trabajador.pago_por_dia}</td>
      `;
      tablaTrabajadores.appendChild(row);
    });
  }
}

// Agregar trabajador
formTrabajador.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('nombreTrabajador').value;
  const pagoPorDia = parseFloat(document.getElementById('pagoPorDia').value);

  const { data, error } = await supabase
    .from('trabajadores')
    .insert([{ nombre, pago_por_dia: pagoPorDia }]);

  if (error) {
    console.error('Error al agregar trabajador:', error);
  } else {
    await cargarTrabajadores(); // Actualizar la lista de trabajadores
    formTrabajador.reset();
  }
});

// Registrar día y comidas
formRegistro.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fecha = document.getElementById('fecha').value;
  const trabajo = document.getElementById('trabajo').checked ? 'Sí' : 'No'; // Verificar si trabajó
  const comidas = [];
  if (document.getElementById('desayuno').checked) comidas.push('Desayuno');
  if (document.getElementById('almuerzo').checked) comidas.push('Almuerzo');
  if (document.getElementById('cena').checked) comidas.push('Cena');

  // Obtener todos los trabajadores seleccionados
  const checkboxes = document.querySelectorAll('#listaTrabajadores input[type="checkbox"]:checked');
  const trabajadoresSeleccionados = Array.from(checkboxes).map(checkbox => checkbox.value);

  // Registrar cada trabajador seleccionado
  for (const trabajadorId of trabajadoresSeleccionados) {
    const { data, error } = await supabase
      .from('registros')
      .insert([{ trabajador_id: trabajadorId, fecha, trabajo, comidas: comidas.join(', ') }]);

    if (error) {
      console.error('Error al registrar:', error);
    }
  }

  await mostrarRegistros(); // Mostrar registros actualizados
  await mostrarResumen();
  formRegistro.reset();
});

// Mostrar registros
async function mostrarRegistros() {
  const { data, error } = await supabase
    .from('registros')
    .select(`
      fecha,
      trabajo,
      comidas,
      trabajadores (id, nombre)
    `)
    .order('fecha', { ascending: true });

  if (error) {
    console.error('Error al cargar registros:', error);
  } else {
    tablaRegistros.innerHTML = '';

    // Agrupar registros por fecha
    const registrosPorFecha = {};

    data.forEach(registro => {
      const fecha = registro.fecha;
      const trabajadorId = registro.trabajadores.id;
      const trabajadorNombre = registro.trabajadores.nombre;

      if (!registrosPorFecha[fecha]) {
        registrosPorFecha[fecha] = {};
      }

      // Agregar información del trabajador
      if (!registrosPorFecha[fecha][trabajadorId]) {
        registrosPorFecha[fecha][trabajadorId] = {
          nombre: trabajadorNombre,
          trabajó: registro.trabajo,
          comidas: registro.comidas,
        };
      } else {
        // Si ya existe, concatenar las comidas
        registrosPorFecha[fecha][trabajadorId].comidas += `, ${registro.comidas}`;
      }
    });

    // Obtener todos los trabajadores para crear las columnas
    const trabajadores = await supabase.from('trabajadores').select('id, nombre');
    const trabajadoresData = trabajadores.data;

    // Crear encabezados de la tabla
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th>Fecha</th>`;
    trabajadoresData.forEach(trabajador => {
      headerRow.innerHTML += `<th>${trabajador.nombre}</th>`;
    });
    tablaRegistros.appendChild(headerRow);

    // Mostrar registros agrupados
    for (const fecha in registrosPorFecha) {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${fecha}</td>`;

      trabajadoresData.forEach(trabajador => {
        const trabajadorRegistro = registrosPorFecha[fecha][trabajador.id];
        if (trabajadorRegistro) {
          row.innerHTML += `
            <td>
              <input type="checkbox" ${trabajadorRegistro.trabajó === 'Sí' ? 'checked' : ''} disabled>
              ${trabajadorRegistro.trabajó} - ${trabajadorRegistro.comidas}
            </td>`;
        } else {
          row.innerHTML += `<td>---</td>`;
        }
      });

      tablaRegistros.appendChild(row);
    }

    // Calcular y mostrar el total de días trabajados
    const totalDiasTrabajados = {};
    data.forEach(registro => {
      const trabajadorId = registro.trabajadores.id;
      if (!totalDiasTrabajados[trabajadorId]) {
        totalDiasTrabajados[trabajadorId] = 0;
      }
      if (registro.trabajo === 'Sí') {
        totalDiasTrabajados[trabajadorId]++;
      }
    });

    // Mostrar total de días trabajados
    const totalRow = document.createElement('tr');
    totalRow.innerHTML = `<td><strong>Total Días Trabajados</strong></td>`;
    trabajadoresData.forEach(trabajador => {
      totalRow.innerHTML += `<td>${totalDiasTrabajados[trabajador.id] || 0}</td>`;
    });
    tablaRegistros.appendChild(totalRow);
  }
}

// Calcular gasto en comida
async function calcularGastoComida(trabajadorId) {
  const { data, error } = await supabase
    .from('registros')
    .select('comidas')
    .eq('trabajador_id', trabajadorId);

  if (error) {
    console.error('Error al calcular gasto en comida:', error);
    return 0;
  }

  let totalComidas = 0;
  data.forEach(registro => {
    if (registro.comidas) {
      totalComidas += registro.comidas.split(', ').length;
    }
  });

  const costoPorComida = 3; // $3 por comida
  return totalComidas * costoPorComida;
}

// Mostrar resumen
async function mostrarResumen() {
  const { data: trabajadores, error: errorTrabajadores } = await supabase
    .from('trabajadores')
    .select('id, nombre, pago_por_dia');

  if (errorTrabajadores) {
    console.error('Error al cargar trabajadores:', errorTrabajadores);
    return;
  }

  tablaResumen.innerHTML = '';

  for (const trabajador of trabajadores) {
    const gastoComida = await calcularGastoComida(trabajador.id);
    const diasTrabajados = await calcularDiasTrabajados(trabajador.id);
    const totalBruto = diasTrabajados * trabajador.pago_por_dia;
    const totalAPagar = totalBruto ;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${trabajador.nombre}</td>
      <td>$${gastoComida.toFixed(2)}</td>
      <td>${diasTrabajados}</td>
      <td>$${totalBruto.toFixed(2)}</td>
      <td>$${totalAPagar.toFixed(2)}</td>
    `;
    tablaResumen.appendChild(row);
  }
}

// Nueva función para calcular días trabajados
async function calcularDiasTrabajados(trabajadorId) {
  const { data, error } = await supabase
    .from('registros')
    .select('trabajo')
    .eq('trabajador_id', trabajadorId)
    .eq('trabajo', 'Sí');

  if (error) {
    console.error('Error al calcular días trabajados:', error);
    return 0;
  }

  return data.length; // Retorna la cantidad de días trabajados
}

// Inicializar
cargarTrabajadores();
mostrarRegistros();
mostrarResumen();