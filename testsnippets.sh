endpoint="http://vbma223.netlab.uky.edu:9998/api/"
echo $endpoint
echo -e "Testing service\n"
curl -d '{"address":"800 Rose Street.","department_id":"d-0","service_id":"s-0","taxid":"8808-080"}' -H "Content-Type: application/json" -X POST ${endpoint}addservice
curl ${endpoint}getservice/s-0
curl ${endpoint}removeservice/s-0
echo -e "Testing cleanup\n"
curl ${endpoint}removedepartment/d-0
curl ${endpoint}removeinstitution/8808-080
curl ${endpoint}removeaddress/800%20Rose%20Street.
echo -e "Testing Department\n"
curl -d '{"address":"800 Rose Street.","department_id":"d-0","service_id":"s-0","taxid":"8808-080"}' -H "Content-Type: application/json" -X POST ${endpoint}addservice
curl -d '{"department_id":"d-0","npi":"n-000-000"}' -H "Content-Type: application/json" -X POST ${endpoint}addprovider
curl ${endpoint}getprovider/n-000-000
curl ${endpoint}removeprovider/n-000-000
echo -e "Testing patient\n"
curl -d '{"department_id":"d-0","npi":"n-000-000"}' -H "Content-Type: application/json" -X POST ${endpoint}addprovider
curl -d '{"address":"165 Hill Dale","provider_id":"n-000-000","pid":"p-0-0-0","ssn":"123-233-1333"}' -H "Content-Type: application/json" -X POST ${endpoint}addpatient
curl ${endpoint}getpatient/p-0-0-0
curl ${endpoint}removepatient/p-0-0-0
echo -e "Final Cleanup\n"
curl ${endpoint}removeservice/s-0
curl ${endpoint}removeprovider/n-000-000
curl ${endpoint}removedepartment/d-0
curl ${endpoint}removeinstitution/8808-080
curl ${endpoint}removeaddress/800%20Rose%20Street.
