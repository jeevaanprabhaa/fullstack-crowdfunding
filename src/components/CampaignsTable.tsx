import {Badge, Container, Flex, Group, Pagination, Table, Text} from "@mantine/core";
import {useState} from "react";
import {Campaign} from "../services/campaigns.service";
import {Link} from "react-router-dom";

interface Props {
    campaigns?: Campaign[];
}

const PAGE_SIZE = 10;

const CampaignsTable = ({campaigns = []}: Props) => {
    const [page, setPage] = useState(1);
    const from = (page - 1) * PAGE_SIZE;
    const records = campaigns.slice(from, from + PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(campaigns.length / PAGE_SIZE));

    const statusColor: Record<string, string> = {
        active: 'teal',
        completed: 'blue',
        cancelled: 'red',
    };

    const rows = records.map((record) => (
        <tr key={record.id}>
            <td>
                <Text size="sm" component={Link} to={`/campaigns/${record.id}`} sx={{textDecoration: 'none', '&:hover': {textDecoration: 'underline'}}}>
                    {record.title}
                </Text>
            </td>
            <td>{record.category}</td>
            <td>${record.amount_raised.toLocaleString()}</td>
            <td>${record.goal_amount.toLocaleString()}</td>
            <td>
                <Badge color={statusColor[record.status] || 'gray'} variant="light">
                    {record.status}
                </Badge>
            </td>
            <td>{record.country}</td>
        </tr>
    ));

    if (campaigns.length === 0) {
        return (
            <Container>
                <Text color="dimmed" align="center" py="xl">
                    No campaigns yet. <Link to="/create-campaign">Create your first campaign!</Link>
                </Text>
            </Container>
        );
    }

    return (
        <Container>
            <div style={{overflowX: 'auto'}}>
                <Table striped highlightOnHover>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Amount Raised</th>
                            <th>Goal</th>
                            <th>Status</th>
                            <th>Country</th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </Table>
            </div>
            {totalPages > 1 && (
                <Flex justify="center" mt="md">
                    <Pagination value={page} onChange={setPage} total={totalPages}/>
                </Flex>
            )}
        </Container>
    );
};

export default CampaignsTable;
