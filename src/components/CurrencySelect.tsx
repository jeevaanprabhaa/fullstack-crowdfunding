import {forwardRef} from 'react';
import {Group, Select, Text} from "@mantine/core";
import {ICurrency} from "../types";
import currencyData from "../data/Currencies.json";

const CurrencySelectItem = forwardRef<HTMLDivElement, ICurrency>(
    ({name, cc, ...others}: ICurrency, ref) => (
        <div ref={ref} {...others}>
            <Group noWrap>
                <Text size="sm">{name}</Text>
                <Text size="sm" opacity={0.65}>{cc}</Text>
            </Group>
        </div>
    )
);

interface Props {
    value?: string;
    onChange?: (value: string | null) => void;
}

const CurrencySelect = ({value, onChange}: Props) => {
    return (
        <Select
            label="What currency do you want to raise money in?"
            itemComponent={CurrencySelectItem}
            data={currencyData.data.map(c => ({value: c.cc, label: c.name, ...c}))}
            searchable
            clearable
            maxDropdownHeight={300}
            nothingFound="Nobody here"
            value={value}
            onChange={onChange}
            filter={(val, item) =>
                item?.name?.toLowerCase().includes(val?.toLowerCase().trim()) ||
                item?.cc?.toLowerCase().includes(val?.toLowerCase().trim())
            }
        />
    );
};

export default CurrencySelect;
