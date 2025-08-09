import { Table } from 'antd'
import type { TableProps } from 'antd'

function DataTable<RecordType extends object = any>(props: TableProps<RecordType>) {
  return (
    <Table
      bordered
      size="middle"
      {...props}
    />
  )
}

export default DataTable;