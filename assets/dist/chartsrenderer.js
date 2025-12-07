(function(){
    // Safe guard: wait for DOM
    function ready(fn){
        if(document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    ready(async function(){
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const year = new Date().getFullYear();

        // helper to fetch JSON and handle errors
        async function getJson(url){
            try{
                const r = await fetch(url, { credentials: 'same-origin' });
                if(!r.ok) throw new Error('Network response was not ok');
                return await r.json();
            }catch(e){
                console.error('Fetch error', url, e);
                return null;
            }
        }

        // Expenses yearly bar chart
        const expensesCtx = document.getElementById('expensesYearlyChart');
        if(expensesCtx){
            const payload = await getJson(`/api/stats/expenses/yearly?year=${year}`) || { totals: Array(12).fill(0) };
            new Chart(expensesCtx, {
                type: 'bar',
                data: {
                    labels: monthNames,
                    datasets: [{
                        label: `Expenses ${payload.year || year}`,
                        data: payload.totals || Array(12).fill(0),
                        backgroundColor: 'rgba(220,53,69,0.6)',
                        borderColor: 'rgba(220,53,69,1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Income yearly bar chart
        const incomeCtx = document.getElementById('incomeYearlyChart');
        if(incomeCtx){
            const payload = await getJson(`/api/stats/income/yearly?year=${year}`) || { totals: Array(12).fill(0) };
            new Chart(incomeCtx, {
                type: 'bar',
                data: {
                    labels: monthNames,
                    datasets: [{
                        label: `Income ${payload.year || year}`,
                        data: payload.totals || Array(12).fill(0),
                        backgroundColor: 'rgba(40,167,69,0.6)',
                        borderColor: 'rgba(40,167,69,1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Category pie chart for current month
        const pieCtx = document.getElementById('categoryPieChart');
        if(pieCtx){
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth()+1).padStart(2,'0');
            const monthParam = `${y}-${m}`;
            const payload = await getJson(`/api/stats/expenses/category?month=${monthParam}`) || { labels: [], totals: [] };

            // if no labels, show placeholder
            const labels = payload.labels && payload.labels.length ? payload.labels : ['No data'];
            const totals = payload.totals && payload.totals.length ? payload.totals : [1];

            const colors = [
                'rgba(255,99,132,0.7)',
                'rgba(54,162,235,0.7)',
                'rgba(255,205,86,0.7)',
                'rgba(75,192,192,0.7)',
                'rgba(153,102,255,0.7)',
                'rgba(201,203,207,0.7)'
            ];

            new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: totals,
                        backgroundColor: colors.slice(0, labels.length),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

    });
})();
