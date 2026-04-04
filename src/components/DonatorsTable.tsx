import {Container, Flex, Pagination, Table, Text, Badge} from "@mantine/core";
import {useState} from "react";
import {Donation} from "../services/donations.service";

interface Props {
    donations?: Donation[];
}

const PAGE_SIZE = 10;

const DonatorsTable = ({donations = []}: Props) => {
    const [page, setPage] = useState(1);
    const from = (page - 1) * PAGE_SIZE;
    const records = donations.slice(from, from + PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(donations.length / PAGE_SIZE));

    const statusColor: Record<string, string> = {
        completed: 'teal',
        pending: 'yellow',
        failed: 'red',
        refunded: 'gray',
    };

    const rows = records.map((record) => (
        <tr key={record.id}>
            <td>
                <Text size="sm">{record.anonymous ? 'Anonymous' : record.donor_name}</Text>
            </td>
            <td>
                <Text size="sm">{record.campaign?.title || '—'}</Text>
            </td>
            <td>${record.amount.toLocaleString()}</td>
            <td>
                <Badge color={statusColor[record.status] || 'gray'} variant="light">
                    {record.status}
                </Badge>
            </td>
            <td>{new Date(record.created_at).toLocaleDateString()}</td>
        </tr>
    ));

    if (donations.length === 0) {
        return (
            <Container>
                <Text color="dimmed" align="center" py="xl">
                    No donations yet.
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
                            <th>Donor</th>
                            <th>Campaign</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
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

export default DonatorsTable;
