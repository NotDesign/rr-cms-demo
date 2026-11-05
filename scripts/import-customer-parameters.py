"""Read the client's synthetic, multi-section CSV without altering any source value."""
import csv
import hashlib
import json
import re
import sys
from pathlib import Path

source = Path(sys.argv[1])
content = source.read_bytes()
rows = list(csv.reader(content.decode('utf-8-sig').splitlines()))
blocks, current = [], []
for number, row in enumerate(rows, 1):
    if any(value.strip() for value in row):
        current.append((number, row))
    elif current:
        blocks.append(current)
        current = []
if current:
    blocks.append(current)
ids = ['overview','config','report_parameters','parties','party_roles','contracts','sites','relations','credentials','bets','wallet','api_calls','rounds','sessions','card_players','card_tables','fish_rooms','fish_batches','fish_bullets','fish_hits','slot_events','mini_details','slot_bets','fish_bets','mini_bets','house_bets','platform_report','customer_report','site_report','category_report','game_report','round_report','card_report','lookup','lookup_source','recovery_rules','recovery_cases','decisions','closing_cases','card_rounds','api_contract','changes','dictionary','source_checks','source_diff']
assert len(blocks) == len(ids) * 2, 'Source sections changed; inspect before importing'

known_fields={row[2] for _,row in blocks[85][1:] if len(row)>2 and row[2]}

def field(header):
    candidates=[name for name in known_fields if header.startswith(name)]
    if candidates:
        return max(candidates,key=len)
    match = re.match(r'[A-Za-z][A-Za-z0-9_]*', header)
    if not match:
        return header
    value = match.group()
    if len(value) % 2 == 0 and value[:len(value)//2] == value[len(value)//2:]:
        return value[:len(value)//2]
    return value

tables = []
for index, key in enumerate(ids):
    heading, table = blocks[index*2:index*2+2]
    header_row, headers = table[0]
    # Empty tail columns are spreadsheet formatting, not business fields.
    columns = [i for i, value in enumerate(headers) if value]
    assert all(not value for _, row in table[1:] for i, value in enumerate(row) if i not in columns), key
    fields = [field(headers[i]) for i in columns]
    # The read-only Slot view calls its bet-id column "Game ID" in the source.
    # Preserve rawHeaders and values while exposing its actual relation explicitly.
    if key == 'slot_bets':
        fields[0] = 'bet_id'
    assert len(fields) == len(set(fields)), (key, fields)
    entries = [{name: row[i] if i < len(row) else '' for i, name in zip(columns, fields)} for _, row in table[1:]]
    tables.append({'id': key, 'title': heading[0][1][0], 'description': heading[1][1][0] if len(heading)>1 else '', 'headerRow': header_row,
                   'rawHeaders': [headers[i] for i in columns], 'fields': fields, 'rows': entries,
                   'sourceRows': [n for n, _ in table[1:]]})
output = {'source': {'name': source.name, 'sha256': hashlib.sha256(content).hexdigest(), 'rowCount': len(rows), 'synthetic': True}, 'tables': tables}
destination = Path(__file__).resolve().parents[1] / 'data/customer-parameters.json'
destination.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':'))+'\n')
print(json.dumps({'sections':len(tables),'rows':sum(len(t['rows']) for t in tables),'path':str(destination),'sha256':output['source']['sha256']},ensure_ascii=False))
