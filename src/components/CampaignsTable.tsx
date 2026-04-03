import {ICampaign} from "../types";
import {Avatar, Group, Text, Table, Pagination, Container, Flex} from "@mantine/core";
import campaignsData from "../data/Campaigns.json";
import {useEffect, useState} from "react";

const PAGE_SIZE = 10;

const CampaignsTable = () => {
    const [page, setPage] = useState(1);
    const [records, setRecords] = useState<ICampaign[]>(campaignsData.data.slice(0, PAGE_SIZE));

    useEffect(() => {
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE;
        setRecords(campaignsData.data.slice(from, to));
    }, [page]);

    const rows = records.map((record: ICampaign) => (
        <tr key={record.title}>
            <td>
                <Group spacing="sm">
                    <Avatar src={record.createdByImage} alt={`${record.createdBy} profile avatar`} size="sm" radius="xl"/>
                    <Text size="sm">{record.createdBy}</Text>
                </Group>
            </td>
            <td>{record.title}</td>
            <td>{record.category}</td>
            <td>{record.amountRaised}</td>
            <td>{record.goal}</td>
            <td>{record.contributors}</td>
            <td>{record.country}</td>
        </tr>
    ));

    const totalPages = Math.ceil(campaignsData.data.length / PAGE_SIZE);

    return (
        <Container>
            <div style={{ overflowX: 'auto' }}>
                <Table striped highlightOnHover>
                    <thead>
                        <tr>
                            <th>Created By</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Amount Raised</th>
                            <th>Goal</th>
                            <th>Contributors</th>
                            <th>Country</th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </Table>
            </div>
            <Flex justify="center" mt="md">
                <Pagination value={page} onChange={setPage} total={totalPages} />
            </Flex>
        </Container>
    );
};

export default CampaignsTable;
