var app = angular.module('myApp', []);


app.controller("MainController",['$scope',function($scope){

   $scope.data = [{ firstName:"Jayaram",lastName:"P",email:"jayaram@gmail.com",
	                   project:"javasavvy",designation:"Software Engineer",empId:"10001"},
	              {firstName:"Arjun",lastName:"D",email:"Arjun@gmail.com",
	                   project:"Sample Project",designation:"Test",empId:"10002"                 
	              } ];


	$scope.empoyees = angular.copy( $scope.data);4
	 $scope.enabledEdit =[];

    $scope.addTimeslot = function(){
	    var emp ={ firstName:"",lastName:"",email:"",
	                   project:"",designation:"",empId:"",disableEdit:false};
		$scope.empoyees.push(emp);
		 $scope.enabledEdit[$scope.empoyees.length-1]=true;
	}
	$scope.deleteTimeslot = function(index) {
		  $scope.empoyees.splice(index,1);
	}
	
	
}]);
