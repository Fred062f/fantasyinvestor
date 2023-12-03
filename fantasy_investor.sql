Table: users
Columns:
id int AI PK 
username varchar(255) 
password varchar(255) 
balance decimal(10,0)

1	user1	test1234	5650
2	user2	test1234	10980
3	user3	test1234	6324
4	user4	test1234	3248
5	user5	test1234	3663
6	user6	test1234	4003

______________________________________________

Table: portfolios
Columns:
id int AI PK 
user_id int 
stock_symbol varchar(10) 
quantity int 
price decimal(10,2) 
transaction_type varchar(10) 
transaction_date date

1	1	TSLA	10	238.83	bought	2023-12-03
2	1	AAPL	10	191.24	bought	2023-12-03
3	1	TSLA	-5	238.83	sold	2023-12-03
4	2	NVO	50	100.40	bought	2023-12-03
5	3	AMZN	25	147.03	bought	2023-12-03
6	3	NTFX	25	0.00	bought	2023-12-03
7	4	MSFT	20	374.51	bought	2023-12-03
8	4	MSFT	-20	374.51	sold	2023-12-03
9	4	MSFT	25	374.51	bought	2023-12-03
10	5	PFE	100	28.91	bought	2023-12-03
11	5	F	100	10.58	bought	2023-12-03
12	6	GOOG	50	133.32	bought	2023-12-03
13	6	GOOG	-5	133.32	sold	2023-12-03
