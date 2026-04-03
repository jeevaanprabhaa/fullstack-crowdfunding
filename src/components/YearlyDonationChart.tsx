import {Box, Text} from "@mantine/core";
import ReactApexChart from "react-apexcharts";
import {ApexOptions} from "apexcharts";
import {Campaign} from "../services/campaigns.service";

interface Props {
    campaigns?: Campaign[];
}

const YearlyDonationChart = ({campaigns = []}: Props) => {
    const categoryMap: Record<string, number> = {};
    campaigns.forEach(c => {
        categoryMap[c.category] = (categoryMap[c.category] || 0) + c.amount_raised;
    });

    const hasCampaigns = Object.keys(categoryMap).length > 0;

    const series = hasCampaigns
        ? Object.entries(categoryMap).map(([name, total]) => ({name, data: [total]}))
        : [
            {name: 'Medical', data: [44]},
            {name: 'Environment', data: [13]},
            {name: 'Technology', data: [11]},
            {name: 'Emergency', data: [21]},
        ];

    const options: ApexOptions = {
        chart: {
            type: 'bar',
            height: 350,
            stacked: true,
            toolbar: {show: true},
        },
        plotOptions: {
            bar: {
                horizontal: false,
                borderRadius: 10,
                dataLabels: {
                    total: {
                        enabled: true,
                        style: {fontSize: '13px', fontWeight: 900}
                    }
                }
            },
        },
        xaxis: {
            categories: hasCampaigns ? ['Your Campaigns'] : ['Sample Data'],
        },
        legend: {
            position: 'right',
            offsetY: 40
        },
        fill: {opacity: 1},
        yaxis: {
            labels: {
                formatter: (val) => `$${val.toLocaleString()}`
            }
        }
    };

    return (
        <Box>
            {!hasCampaigns && (
                <Text size="sm" color="dimmed" mb="sm">Create campaigns to see your real donation data here.</Text>
            )}
            <ReactApexChart options={options} series={series} type="bar" height={350}/>
        </Box>
    );
};

export default YearlyDonationChart;
