const miLista = document.getElementById('miLista');
const inputValor = document.getElementById('inputValor');
const valorCalculadoSection = document.querySelector('.valorCalculado');
const botonBuscar = document.getElementById('botonBuscar');
const apiURL = 'https://mindicador.cl/api';
let monedasData = {};
let myChart;
let cacheHistorico = {};

async function getMonedas() {
    const res = await fetch(apiURL);
    const data = await res.json(); 
    return data; 
}

async function fetchHistoricalData(moneda) {
    if (cacheHistorico[moneda]) {
        return cacheHistorico[moneda];
    }
    try {
        const res = await fetch(`${apiURL}/${moneda}`);
        const data = await res.json(); 
        cacheHistorico[moneda] = data;
        return data;
    } catch (error) {
        document.getElementById('chartLegend').innerHTML = '<p>Error al cargar los datos históricos</p>';
        return null;
    }
}

async function renderSelect() {
    try {
        const data = await getMonedas();
        monedasData = data;

        Object.keys(data).forEach(key => {
            if (data[key]?.nombre) {
                const option = document.createElement('option');
                option.value = key; 
                option.textContent = data[key].nombre;  
                miLista.appendChild(option);
            }           
        });

    } catch (error) {
        console.error('Error:', error);
        valorCalculadoSection.innerHTML = '<p>Error al cargar las monedas.</p>';
    }
}

async function calcular() {
    const valorInput = parseFloat(inputValor.value);
    const monedaSeleccionada = miLista.value;

    if (!isNaN(valorInput) && valorInput > 0 && monedaSeleccionada) {
        const valorMoneda = monedasData[monedaSeleccionada]?.valor;

        if (valorMoneda) {
            const valorConvertido = valorInput / valorMoneda;
            valorCalculadoSection.innerHTML = `Valor Convertido: ${valorConvertido.toFixed(2)} ${monedasData[monedaSeleccionada].nombre}`;

            try {
                const historicalData = await fetchHistoricalData(monedaSeleccionada);
                const series = historicalData.serie;
                if (series && series.length > 0) {
                    drawChart(series);
                } else {
                    console.error("No se encontró la propiedad 'serie' en los datos históricos.");
                }
            } catch (error) {
                console.error("Error al obtener datos históricos:", error);
            }
        } else {
            valorCalculadoSection.innerHTML = '<p>Error al obtener el valor de la moneda.</p>';
        }
    } else {
        valorCalculadoSection.innerHTML = '<p>Por favor ingresa un valor válido y selecciona una moneda.</p>';
    }
}

function drawChart(historicalData) {
    const labels = historicalData.map(dataPoint => dataPoint.fecha.substr(0, 10));
    const values = historicalData.map(dataPoint => dataPoint.valor);

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    const ctx = document.getElementById('myChart').getContext('2d');

    if (myChart) {
        myChart.data.labels = labels;
        myChart.data.datasets[0].data = values;
        myChart.update();
    } else {
        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valor Histórico',
                    data: values,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false,
                    pointBackgroundColor: values.map(value => 
                        value === maxValue ? 'red' : 
                        value === minValue ? '#00ff00' : 
                        'rgba(75, 192, 192, 1)'
                    ),
                    pointRadius: values.map(value => 
                        value === maxValue || value === minValue ? 6 : 3
                    ),
                    pointHoverRadius: values.map(value => 
                        value === maxValue || value === minValue ? 8 : 5
                    )
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(2);
                                }
                                if (context.raw === maxValue) {
                                    label += ' (Máximo Histórico)';
                                } else if (context.raw === minValue) {
                                    label += ' (Mínimo Histórico)';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    const legendHtml = `
        <div class="legend-item">
            <span class="legend-color" style="background-color: red;"></span>
            <span>Máximo Histórico</span>
        </div>
        <div class="legend-item">
            <span class="legend-color" style="background-color: #00ff00;"></span>
            <span>Mínimo Histórico</span>
        </div>
        <div class="legend-item">
            <span class="legend-color" style="background-color: rgba(75, 192, 192, 1);"></span>
            <span>Valor Histórico</span>
        </div>
    `;
    document.getElementById('chartLegend').innerHTML = legendHtml;
}

botonBuscar.addEventListener('click', calcular);

inputValor.addEventListener('input', () => {
    botonBuscar.disabled = !inputValor.value || !miLista.value;
});

miLista.addEventListener('change', () => {
    botonBuscar.disabled = !inputValor.value || !miLista.value;
});

renderSelect();